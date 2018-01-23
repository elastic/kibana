export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the system module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable system',
    ],
    textPost: 'Modify the settings in the `modules.d/system.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the system module',
    commands: [
      'sudo metricbeat modules enable system',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/system.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the system module',
    commands: [
      'sudo metricbeat modules enable system',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/system.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the system module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable system',
    ],
    textPost: 'Modify the settings in the `modules.d/system.yml` file.'
  }
};
