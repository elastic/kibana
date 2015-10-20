require('ace');
require('./css/sense.css');

require('ui/chrome')
.setBrand({
  logo: 'url(/plugins/sense/favicon.ico) center no-repeat',
  smallLogo: 'url(/plugins/sense/favicon.ico) center no-repeat'
})
.setTabs([{
  id: '',
  title: 'Sense'
}])
.setRootTemplate(require('./index.html'))
.setRootController(function () {
  require('./src/app');
});
