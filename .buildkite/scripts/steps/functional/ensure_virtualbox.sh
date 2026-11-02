#!/usr/bin/env bash

# Ensures VirtualBox is installed with working kernel modules and
# exports VAGRANT_DEFAULT_PROVIDER=virtualbox.
# Must be sourced (not executed) so the export propagates to the caller.

echo "--- Ensure VirtualBox provider"

_vbox_kernel_ok() {
  local output
  output=$(VBoxManage --version 2>&1)
  if echo "$output" | grep -qi "kernel module is not loaded"; then
    return 1
  fi
  return 0
}

_ensure_vbox_modules() {
  sudo modprobe vboxdrv 2>/dev/null && return 0
  sudo /sbin/vboxconfig 2>/dev/null && return 0
  sudo /sbin/rcvboxdrv setup 2>/dev/null && return 0
  return 1
}

_print_vbox_diagnostics() {
  echo "VirtualBox diagnostics:"
  echo "  vagrant: $(vagrant --version 2>/dev/null || echo 'not found')"
  echo "  VBoxManage: $(which VBoxManage 2>/dev/null || echo 'not in PATH')"
  echo "  VBoxManage --version: $(VBoxManage --version 2>&1 || echo 'failed')"
  echo "  vbox modules: $(lsmod 2>/dev/null | grep vbox || echo 'none loaded')"
  echo "  vbox packages: $(dpkg -l 2>/dev/null | grep -i virtualbox | awk '{print $2, $3}' || echo 'none')"
  echo "  kernel: $(uname -r)"
  echo "  dkms status: $(dkms status 2>/dev/null || echo 'dkms not available')"
}

_upgrade_to_vbox71() {
  echo "Upgrading to VirtualBox 7.1 (supports newer kernels)..."

  # Oracle's repo is pre-configured on CI images; install 7.1 from there
  if apt-cache show virtualbox-7.1 &>/dev/null; then
    echo "virtualbox-7.1 available from Oracle repo, installing..."
    sudo apt-get install -y --no-install-recommends virtualbox-7.1 2>&1
    return $?
  fi

  # If Oracle repo isn't configured, add it
  echo "Adding Oracle VirtualBox repository..."
  local codename
  codename=$(lsb_release -cs 2>/dev/null || echo "noble")
  wget -qO- https://www.virtualbox.org/download/oracle_vbox_2016.asc | sudo gpg --dearmor --yes -o /usr/share/keyrings/oracle-virtualbox-2016.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-virtualbox-2016.gpg] https://download.virtualbox.org/virtualbox/debian ${codename} contrib" | \
    sudo tee /etc/apt/sources.list.d/virtualbox-oracle.list
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends virtualbox-7.1 2>&1
  return $?
}

_ensure_virtualbox() {
  # 1. Already working — nothing to do
  if command -v VBoxManage &>/dev/null && _vbox_kernel_ok; then
    echo "VirtualBox ready: $(VBoxManage --version 2>&1 | tail -1)"
    return 0
  fi

  # 2. VBoxManage exists but kernel module not loaded — try loading
  if command -v VBoxManage &>/dev/null; then
    echo "VBoxManage found but kernel module not loaded, attempting recovery..."
    if _ensure_vbox_modules && _vbox_kernel_ok; then
      echo "VirtualBox kernel module recovered: $(VBoxManage --version 2>&1 | tail -1)"
      return 0
    fi

    # Modules couldn't load — likely kernel too new for current VBox version.
    # Upgrade to 7.1 which supports newer kernels.
    echo "Kernel module build failed for current VirtualBox, upgrading to 7.1..."
    if _upgrade_to_vbox71 && _ensure_vbox_modules && _vbox_kernel_ok; then
      echo "VirtualBox 7.1 installed and ready: $(VBoxManage --version 2>&1 | tail -1)"
      return 0
    fi
  else
    # 3. VBoxManage not found at all — install 7.1 from scratch
    echo "VirtualBox not found, installing 7.1..."
    sudo apt-get update -qq
    if _upgrade_to_vbox71 && _ensure_vbox_modules && _vbox_kernel_ok; then
      echo "VirtualBox 7.1 installed and ready: $(VBoxManage --version 2>&1 | tail -1)"
      return 0
    fi
  fi

  _print_vbox_diagnostics
  echo "ERROR: VirtualBox provider could not be made available"
  return 1
}

_ensure_virtualbox
export VAGRANT_DEFAULT_PROVIDER=virtualbox
