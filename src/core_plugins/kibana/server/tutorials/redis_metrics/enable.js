export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the redis module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `modules.d/redis.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the redis module',
    commands: [
      'sudo metricbeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/redis.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the redis module',
    commands: [
      'sudo metricbeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/redis.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the redis module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable redis',
    ],
    textPost: 'Modify the settings in the `modules.d/redis.yml` file.'
  }
};
