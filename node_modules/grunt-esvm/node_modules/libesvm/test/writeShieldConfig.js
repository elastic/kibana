/* jshint mocha:true */

var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');
var expect = require('chai').expect;
var temp = require('temp').track();
var bcrypt = require('bcryptjs');
var config = require('./fixtures/config');
var writeShieldConfig = require('../lib/writeShieldConfig');

describe('writeShieldConfig', function () {
  var tmpDir;
  var conf;
  var writter;
  var shieldUsers = [{
    "username": "kibana",
    "password": "notsecure",
    "roles": ["kibana4_server"]
  },
  {
    "username": "user",
    "password": "notsecure",
    "roles": ["kibana4", "marvel"]
  },
  {
    "username": "admin",
    "password": "notsecure",
    "roles": ["admin"]
  }];

  before(function (done) {
    temp.mkdir('writeShieldConfig', function(err, dirPath) {
      if (err) return done(err);

      tmpDir = dirPath;
      conf = config.create({
        path: path.join(tmpDir, '2.1.0'),
        directory: tmpDir,
        version: '2.1.0',
        shield: {
          users: shieldUsers
        }
      });
      writter = writeShieldConfig(conf);

      done();
    });
  });

  after(function (done) {
    temp.cleanup(done);
  });

  describe('Creating users for Shield', function () {
    before(function () {
      return writter(tmpDir);
    });

    function readFile(name) {
      var usersFile = path.join(tmpDir, 'shield', name);
      return fs.readFileSync(usersFile, { encoding: 'utf8' });
    }

    it('should create ' + shieldUsers.length + ' users', function () {
      var contents = readFile('users');
      var users = contents.split('\n');
      expect(users).to.have.length(3);
    });

    it('should contain all users', function () {
      var contents = readFile('users');
      var users = contents.split('\n').map(function (user) {
        return user.split(':')[0];
      });

      shieldUsers.forEach(function (user) {
        expect(users).to.contain(user.username);
      });
    });

    it('should use bcrypted passwords', function () {
      var contents = readFile('users');
      var users = contents.split('\n').map(function (user) {
        return {
          username: user.split(':')[0],
          hash: user.split(':')[1],
        };
      });

      shieldUsers.forEach(function (shieldUser) {
        var user = users.reduce(function (match, user) {
          if (match) return match;
          if (user.username === shieldUser.username) return user;
        });

        expect(bcrypt.compareSync(shieldUser.password, user.hash)).to.be.true;
      })
    });
  });
});
