require('plugins/serverStatus/KibanaStatusApp');
require('plugins/serverStatus/serverStatus.less');

require('chrome')
.setNavBackground('grey')
.setTabs([
  {
    id: '',
    title: 'Server Status'
  }
])
.setRootTemplate(require('plugins/serverStatus/serverStatus.html'))
.setRootController('statusPage', 'StatusPage');
