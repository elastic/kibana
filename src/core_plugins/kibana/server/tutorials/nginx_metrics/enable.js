export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the nginx module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the nginx module',
    commands: [
      'sudo metricbeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/nginx.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the nginx module',
    commands: [
      'sudo metricbeat modules enable nginx',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/nginx.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the nginx module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable nginx',
    ],
    textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
  }
};
