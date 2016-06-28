#!/usr/bin/env node

var dns = require('dns');

function check(domain, callback) {
  var done = false, count = 3;

  dns.resolveCname(domain, handleRecords);
  dns.resolve4(domain, handleRecords);
  dns.resolve6(domain, handleRecords);

  function handleRecords(err, records) {
    if (done) return;
    count--;
    if (!err && records && records.length) {
      done = true;
      return dns.resolveMx(domain, handleMail);
    }
    if (count === 0) {
      done = true;
      // ain't got time for node style callbacks
      callback(false);
    }
  }

  function handleMail(err, records) {
    if ((!err || err.code === dns.NODATA) && records && records.length) {
      return callback(false);
    }
    callback(true);
  }
}

function spin(max, concurrent) {
  if (!(max >= 0)) {
    max = 1;
  }
  if (!(concurrent > 0)) {
    concurrent = 4;
  }
  var active = 0, domain = domains(4, ['com', 'org', 'net']);
  (function next() {
    active++;
    var d = domain();
    check(d, function(nomx) {
      active--;
      if (nomx) {
        console.log(d);
        if (!--max) {
          process.exit();
        }
      }
      if (active < concurrent) {
        next();
      }
    });
    if (active < concurrent) {
      next();
    }
  })();
}

spin(1, 16);

function domains(length, tops) {
  var index = 0, end = Math.pow(26, length) * tops.length;
  tops = tops.slice();
  return function next() {
    if (index === end) return;
    var active = index++, domain = '';
    var main = tops[active % tops.length];
    active = (active / tops.length) | 0;
    for (var i = 0; i < length; i++) {
      domain = String.fromCharCode(97 + active % 26) + domain;
      active = (active / 26) | 0;
    }
    domain += '.' + main;
    return domain;
  };
}
