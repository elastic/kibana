export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the mysql module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable mysql',
    ],
    textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the mysql module',
    commands: [
      'sudo metricbeat modules enable mysql',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/mysql.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the mysql module',
    commands: [
      'sudo metricbeat modules enable mysql',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/mysql.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the mysql module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable mysql',
    ],
    textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
  }
};
