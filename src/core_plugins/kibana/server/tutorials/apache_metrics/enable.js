export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the apache module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable apache',
    ],
    textPost: 'Modify the settings in the `modules.d/apache.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the apache module',
    commands: [
      'sudo metricbeat modules enable apache',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/apache.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the apache module',
    commands: [
      'sudo metricbeat modules enable apache',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/apache.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the apache module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable apache',
    ],
    textPost: 'Modify the settings in the `modules.d/apache.yml` file.'
  }
};
