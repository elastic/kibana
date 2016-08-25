export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      spyModes: [
        'plugins/spy_modes/table_spy_mode',
        'plugins/spy_modes/req_resp_stats_spy_mode'
      ]
    }
  });
}
