let kibanaLogoUrl = require('ui/images/kibana.png');

require('ui/chrome')
.setBrand({
  'logo': 'url(' + kibanaLogoUrl + ') left no-repeat',
  'smallLogo': 'url(' + kibanaLogoUrl + ') left no-repeat'
})
.setShowAppsLink(false)
.setTabs([{
  id: '',
  title: 'Login'
}])
.setRootTemplate(require('plugins/login/login.html'))
.setRootController('login', ($http) => {
  var login = {
    loading: false
  };

  login.submit = (username, password) => {
    login.loading = true;

    $http.post('/login', {
      username: username,
      password: password
    }).then(
      (response) => window.location.href = '/',
      (error) => login.error = true
    ).finally(() => login.loading = false);
  };

  return login;
});