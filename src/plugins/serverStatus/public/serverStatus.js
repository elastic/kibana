require('plugins/serverStatus/serverStatusController');
require('plugins/serverStatus/serverStatusMetric');
require('plugins/serverStatus/serverStatus.less');

require('chrome')
.setTabs([
  {
    id: '',
    title: 'Server Status'
  }
])
.setRootTemplate(require('plugins/serverStatus/serverStatus.html'))
.setRootController('ui', 'ServerStatusController');
