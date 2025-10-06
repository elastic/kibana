#!/usr/bin/env bash

set -euo pipefail

# Directory that stores namespace bookkeeping (pid files, metadata, logs).
FTR_NETNS_STATE_DIR=${FTR_NETNS_STATE_DIR:-${WORKSPACE:-$(pwd)}/.buildkite/tmp/ftr_netns}
mkdir -p "${FTR_NETNS_STATE_DIR}"

# Networking defaults. These can be overridden via environment variables in Buildkite.
FTR_NETNS_MODE=${FTR_NETNS_MODE:-auto}
FTR_NETNS_BRIDGE_NAME=${FTR_NETNS_BRIDGE_NAME:-kbn-ftr-br0}
FTR_NETNS_IPV4_PREFIX=${FTR_NETNS_IPV4_PREFIX:-172.31.0}
FTR_NETNS_PREFIX_LENGTH=${FTR_NETNS_PREFIX_LENGTH:-24}
FTR_NETNS_GATEWAY=${FTR_NETNS_GATEWAY:-${FTR_NETNS_IPV4_PREFIX}.1}
FTR_NETNS_BRIDGE_ADDRESS=${FTR_NETNS_BRIDGE_ADDRESS:-${FTR_NETNS_GATEWAY}/${FTR_NETNS_PREFIX_LENGTH}}
FTR_NETNS_SUBNET_CIDR=${FTR_NETNS_SUBNET_CIDR:-${FTR_NETNS_IPV4_PREFIX}.0/${FTR_NETNS_PREFIX_LENGTH}}
FTR_NETNS_MTU=${FTR_NETNS_MTU:-65520}

# shellcheck disable=SC2034 # The array is mutated through helper functions.
declare -a FTR_NETNS_ACTIVE_INDICES=()

# Adds a namespace index to the active list if it is not already registered.
ftr_netns_mark_active() {
  local namespace_index="$1"
  for tracked_index in "${FTR_NETNS_ACTIVE_INDICES[@]}"; do
    if [[ "${tracked_index}" == "${namespace_index}" ]]; then
      return 0
    fi
  done
  FTR_NETNS_ACTIVE_INDICES+=("${namespace_index}")
}

# Removes a namespace index from the active list.
ftr_netns_mark_inactive() {
  local namespace_index="$1"
  local next_active_indices=()
  for tracked_index in "${FTR_NETNS_ACTIVE_INDICES[@]}"; do
    if [[ "${tracked_index}" != "${namespace_index}" ]]; then
      next_active_indices+=("${tracked_index}")
    fi
  done
  FTR_NETNS_ACTIVE_INDICES=("${next_active_indices[@]}")
}

# Returns the namespace name for an index.
ftr_netns_name() {
  local namespace_index="$1"
  printf "kbnftrns%d" "${namespace_index}"
}

# Returns the host-side veth interface name for an index.
ftr_netns_host_veth() {
  local namespace_index="$1"
  printf "kbnf%dh" "${namespace_index}"
}

# Returns the namespace-side veth interface name for an index.
ftr_netns_ns_veth() {
  local namespace_index="$1"
  printf "kbnf%dn" "${namespace_index}"
}

# Computes the IPv4 address that will be assigned to a namespace.
ftr_netns_ipv4_for_index() {
  local namespace_index="$1"
  local last_octet=$((10 + namespace_index))
  if [[ ${last_octet} -ge 255 ]]; then
    echo "Namespace index ${namespace_index} exceeds IPv4 address space for ${FTR_NETNS_IPV4_PREFIX}" >&2
    return 1
  fi
  printf "%s.%d" "${FTR_NETNS_IPV4_PREFIX}" "${last_octet}"
}

# Produces the on-disk path that represents the namespace.
ftr_netns_path() {
  local identifier="$1"
  if [[ "${identifier}" =~ ^[0-9]+$ ]]; then
    printf "/var/run/netns/%s" "$(ftr_netns_name "${identifier}")"
  else
    printf "/var/run/netns/%s" "${identifier}"
  fi
}

# Ensures IPv4 forwarding is enabled when running in bridge mode.
ftr_netns_enable_ipv4_forwarding() {
  if command -v sysctl >/dev/null 2>&1; then
    sysctl -w net.ipv4.ip_forward=1 >/dev/null
  fi
}

# Configures NAT rules for the shared bridge, adding them only once.
ftr_netns_configure_nat_rules() {
  if ! command -v iptables >/dev/null 2>&1; then
    echo "iptables is required for bridge mode" >&2
    return 1
  fi

  if ! iptables -C FORWARD -i "${FTR_NETNS_BRIDGE_NAME}" -j ACCEPT >/dev/null 2>&1; then
    iptables -I FORWARD -i "${FTR_NETNS_BRIDGE_NAME}" -j ACCEPT
  fi

  if ! iptables -C FORWARD -o "${FTR_NETNS_BRIDGE_NAME}" -j ACCEPT >/dev/null 2>&1; then
    iptables -I FORWARD -o "${FTR_NETNS_BRIDGE_NAME}" -j ACCEPT
  fi

  if ! iptables -t nat -C POSTROUTING -s "${FTR_NETNS_SUBNET_CIDR}" -j MASQUERADE >/dev/null 2>&1; then
    iptables -t nat -A POSTROUTING -s "${FTR_NETNS_SUBNET_CIDR}" -j MASQUERADE
  fi
}

# Sets up the shared bridge that connects namespaces to the host network.
ftr_netns_prepare_bridge() {
  if ! command -v ip >/dev/null 2>&1; then
    echo "ip (iproute2) is required for bridge mode" >&2
    return 1
  fi

  if ! ip link show "${FTR_NETNS_BRIDGE_NAME}" >/dev/null 2>&1; then
    ip link add name "${FTR_NETNS_BRIDGE_NAME}" type bridge
  fi

  ip link set "${FTR_NETNS_BRIDGE_NAME}" up

  if ! ip addr show dev "${FTR_NETNS_BRIDGE_NAME}" | grep -q "${FTR_NETNS_GATEWAY}"; then
    ip addr add "${FTR_NETNS_BRIDGE_ADDRESS}" dev "${FTR_NETNS_BRIDGE_NAME}" 2>/dev/null || true
  fi

  ftr_netns_enable_ipv4_forwarding
  ftr_netns_configure_nat_rules
}

# Tears down the host veth pair that was created for a namespace.
ftr_netns_remove_veth() {
  local host_veth_name="$1"
  ip link delete "${host_veth_name}" >/dev/null 2>&1 || true
}

# Configures bridge-based networking for a namespace. Returns 0 on success.
ftr_netns_try_bridge() {
  local namespace_index="$1"
  local namespace_name="$2"
  local host_veth_name="$3"
  local namespace_veth_name="$4"

  ftr_netns_prepare_bridge || return 1

  # Create a veth pair that connects the namespace to the bridge.
  ftr_netns_remove_veth "${host_veth_name}"
  ip link add "${host_veth_name}" type veth peer name "${namespace_veth_name}" || return 1

  if ! ip link set "${host_veth_name}" master "${FTR_NETNS_BRIDGE_NAME}"; then
    ftr_netns_remove_veth "${host_veth_name}"
    return 1
  fi

  ip link set "${host_veth_name}" up || {
    ftr_netns_remove_veth "${host_veth_name}"
    return 1
  }

  if ! ip link set "${namespace_veth_name}" netns "${namespace_name}"; then
    ftr_netns_remove_veth "${host_veth_name}"
    return 1
  fi

  local namespace_ipv4
  namespace_ipv4=$(ftr_netns_ipv4_for_index "${namespace_index}") || {
    ftr_netns_remove_veth "${host_veth_name}"
    return 1
  }

  ip netns exec "${namespace_name}" ip link set lo up
  ip netns exec "${namespace_name}" ip link set "${namespace_veth_name}" name eth0
  ip netns exec "${namespace_name}" ip addr flush dev eth0
  ip netns exec "${namespace_name}" ip addr add "${namespace_ipv4}/${FTR_NETNS_PREFIX_LENGTH}" dev eth0
  ip netns exec "${namespace_name}" ip link set eth0 up
  ip netns exec "${namespace_name}" ip route replace default via "${FTR_NETNS_GATEWAY}"

  echo "bridge" > "${FTR_NETNS_STATE_DIR}/${namespace_name}.mode"
}

# Starts slirp4netns for a namespace and waits until it is ready.
ftr_netns_start_slirp() {
  local namespace_name="$1"
  local namespace_path
  namespace_path=$(ftr_netns_path "$namespace_name")

  if ! command -v slirp4netns >/dev/null 2>&1; then
    echo "slirp4netns is required for namespace networking" >&2
    return 1
  fi

  local log_file="${FTR_NETNS_STATE_DIR}/${namespace_name}.slirp.log"
  local pid_file="${FTR_NETNS_STATE_DIR}/${namespace_name}.slirp.pid"
  local ready_fifo
  ready_fifo=$(mktemp -u)
  mkfifo "${ready_fifo}"

  slirp4netns \
    --configure \
    --mtu="${FTR_NETNS_MTU}" \
    --exit-with-parent \
    --ready-fd 3 \
    "${namespace_path}" \
    tap0 \
    3>"${ready_fifo}" \
    >"${log_file}" \
    2>&1 &
  local slirp_pid=$!

  if ! read -r _ <"${ready_fifo}"; then
    echo "slirp4netns did not signal readiness for namespace ${namespace_name}" >&2
  fi

  rm -f "${ready_fifo}"
  echo "${slirp_pid}" > "${pid_file}"
  echo "slirp" > "${FTR_NETNS_STATE_DIR}/${namespace_name}.mode"
}

# Stops slirp4netns if it was started for a namespace.
ftr_netns_stop_slirp() {
  local namespace_name="$1"
  local pid_file="${FTR_NETNS_STATE_DIR}/${namespace_name}.slirp.pid"
  if [[ -f "${pid_file}" ]]; then
    local slirp_pid
    slirp_pid=$(<"${pid_file}")
    if [[ -n "${slirp_pid}" ]] && kill -0 "${slirp_pid}" >/dev/null 2>&1; then
      kill "${slirp_pid}" >/dev/null 2>&1 || true
      wait "${slirp_pid}" >/dev/null 2>&1 || true
    fi
    rm -f "${pid_file}"
  fi
}

# Creates a network namespace for the supplied index. Sets up bridge or slirp networking.
ftr_netns_create() {
  local namespace_index="$1"
  local namespace_name
  namespace_name=$(ftr_netns_name "${namespace_index}")

  ftr_netns_destroy "${namespace_index}" true

  ip netns add "${namespace_name}"

  local host_veth_name
  host_veth_name=$(ftr_netns_host_veth "${namespace_index}")
  local namespace_veth_name
  namespace_veth_name=$(ftr_netns_ns_veth "${namespace_index}")

  local requested_mode="${FTR_NETNS_MODE}"
  local configured_mode=""

  if [[ "${requested_mode}" != "slirp" ]]; then
    if ftr_netns_try_bridge "${namespace_index}" "${namespace_name}" "${host_veth_name}" "${namespace_veth_name}"; then
      configured_mode="bridge"
    elif [[ "${requested_mode}" == "bridge" ]]; then
      echo "Failed to configure bridge networking for namespace ${namespace_name}" >&2
      ip netns delete "${namespace_name}"
      return 1
    else
      echo "Bridge networking unavailable, falling back to slirp4netns for namespace ${namespace_name}" >&2
    fi
  fi

  if [[ -z "${configured_mode}" ]]; then
    ip netns exec "${namespace_name}" ip link set lo up
    ftr_netns_start_slirp "${namespace_name}"
    configured_mode="slirp"
  fi

  echo "${configured_mode}" > "${FTR_NETNS_STATE_DIR}/${namespace_name}.mode"
  echo "${namespace_index}" > "${FTR_NETNS_STATE_DIR}/${namespace_name}.index"
  ftr_netns_mark_active "${namespace_index}"
}

# Removes a namespace and any resources associated with it.
ftr_netns_destroy() {
  local namespace_index="$1"
  local skip_missing_ok="${2:-false}"
  local namespace_name
  namespace_name=$(ftr_netns_name "${namespace_index}")
  local host_veth_name
  host_veth_name=$(ftr_netns_host_veth "${namespace_index}")

  ftr_netns_stop_slirp "${namespace_name}"
  ftr_netns_remove_veth "${host_veth_name}"

  if ip netns list | awk '{print $1}' | grep -Fx "${namespace_name}" >/dev/null 2>&1; then
    ip netns delete "${namespace_name}"
  elif [[ "${skip_missing_ok}" != "true" ]]; then
    echo "Namespace ${namespace_name} did not exist during cleanup" >&2
  fi

  rm -f "${FTR_NETNS_STATE_DIR}/${namespace_name}.mode"
  rm -f "${FTR_NETNS_STATE_DIR}/${namespace_name}.index"
  rm -f "${FTR_NETNS_STATE_DIR}/${namespace_name}.slirp.log"

  ftr_netns_mark_inactive "${namespace_index}"
}

# Cleans up every namespace that has been created during this invocation.
ftr_netns_cleanup_all() {
  local namespace_index
  for namespace_index in "${FTR_NETNS_ACTIVE_INDICES[@]}"; do
    ftr_netns_destroy "${namespace_index}" true
  done
  FTR_NETNS_ACTIVE_INDICES=()
}

# Executes a command inside a namespace.
ftr_netns_exec() {
  local namespace_index="$1"
  shift
  local namespace_name
  namespace_name=$(ftr_netns_name "${namespace_index}")
  ip netns exec "${namespace_name}" "$@"
}
