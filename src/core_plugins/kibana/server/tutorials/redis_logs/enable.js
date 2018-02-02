export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the redis module',
    textPre: 'From the installation directory, run:',
    commands: [
      './filebeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `modules.d/redis.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the redis module',
    commands: [
      'sudo filebeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/redis.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the redis module',
    commands: [
      'sudo filebeat modules enable redis',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/redis.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the redis module',
    textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable redis',
    ],
    textPost: 'Modify the settings in the `modules.d/redis.yml` file.'
  }
};
