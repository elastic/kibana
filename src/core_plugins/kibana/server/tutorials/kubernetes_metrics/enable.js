export const ENABLE_INSTRUCTIONS = {
  OSX: {
    title: 'Enable and configure the kubernetes module',
    textPre: 'From the installation directory, run:',
    commands: [
      './metricbeat modules enable kubernetes',
    ],
    textPost: 'Modify the settings in the `modules.d/kubernetes.yml` file.'
  },
  DEB: {
    title: 'Enable and configure the kubernetes module',
    commands: [
      'sudo metricbeat modules enable kubernetes',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/kubernetes.yml` file.'
  },
  RPM: {
    title: 'Enable and configure the kubernetes module',
    commands: [
      'sudo metricbeat modules enable kubernetes',
    ],
    textPost: 'Modify the settings in the `/etc/metricbeat/modules.d/kubernetes.yml` file.'
  },
  WINDOWS: {
    title: 'Enable and configure the kubernetes module',
    textPre: 'From the `C:\\Program Files\\Metricbeat` folder, run:',
    commands: [
      'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable kubernetes',
    ],
    textPost: 'Modify the settings in the `modules.d/kubernetes.yml` file.'
  }
};
