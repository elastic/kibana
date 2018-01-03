export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the apache2 module',
    textPre: 'From the installation directory, run:',
    commands: [
      './filebeat modules enable apache2',
    ],
    textPost: 'Modify the settings in the `modules.d/apache2.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the apache2 module',
    commands: [
      'sudo filebeat modules enable apache2',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the apache2 module',
    commands: [
      'sudo filebeat modules enable apache2',
    ],
    textPost: 'Modify the settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the apache2 module',
    textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable apache2',
    ],
    textPost: 'Modify the settings in the `modules.d/apache2.yml` file.'
  }
};
