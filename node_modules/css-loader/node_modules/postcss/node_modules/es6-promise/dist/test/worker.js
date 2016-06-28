importScripts('es6-promise.js');
new ES6Promise.Promise(function(resolve, reject) {
  self.onmessage = function (e) {
    if (e.data === 'ping') {
      resolve('pong');
    } else {
      reject(new Error('wrong message'));
    }
  };
}).then(function (result) {
  self.postMessage(result);
}, function (err){
  setTimeout(function () {
    throw err;
  });
});
