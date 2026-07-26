#!/usr/bin/env bash
# L0 — TTI parity with computesdk/benchmarks plus a capability probe.
# The runner measures sandbox provisioning separately; the first marker below
# doubles as "time to first command output".

bench_phase tti

bench_kv cpus "$(nproc 2>/dev/null || echo unknown)"
bench_kv mem_total_kb "$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo unknown)"
bench_kv disk_free_kb "$(df -k --output=avail "$HOME" 2>/dev/null | tail -1 | tr -d ' ' || echo unknown)"
bench_kv has_node "$(command -v node >/dev/null 2>&1 && node -v || echo no)"
bench_kv has_git "$(command -v git >/dev/null 2>&1 && git --version | awk '{print $3}' || echo no)"
bench_kv has_curl "$(command -v curl >/dev/null 2>&1 && echo yes || echo no)"
bench_kv has_sudo "$( (command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null) && echo yes || echo no)"

bench_phase probe_start
if curl -sk -o /dev/null -m 10 https://github.com; then
  bench_kv outbound_net yes
else
  bench_kv outbound_net no
fi
bench_phase probe_done

command -v git >/dev/null 2>&1 || bench_fail git_missing
command -v curl >/dev/null 2>&1 || bench_fail curl_missing

bench_phase done
