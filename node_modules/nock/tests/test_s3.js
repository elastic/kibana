var nock = require('../');
var AWS = require('aws-sdk');
var test = require('tap').test;

test('works with s3, body < 1024 ^ 2', function (t) {
  var REGION = 'us-east-1';

  AWS.config.update({
    region: REGION,
    sslEnabled: true,
    accessKeyId: 'ACCESSKEYID',
    secretAccessKey: 'SECRETACCESSKEY'
  });

  var bucket = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
      Bucket: 'bucket'
    }
  });

  nock('https://bucket.s3.amazonaws.com').put('/key').reply(200);

  bucket.putObject({
      Key: 'key',
      Body: new Buffer(1024 * 1024 - 1), // works
      // Body: new Buffer(1024 * 1024), // doesn't work
      ContentType: 'binary/octet-stream'
    },
    function (err, resp) {
      if (err) throw err;
      t.deepEqual(resp, {});
      t.end();
    });
});

test('works with s3, body = 10 * 1024 ^ 2', function (t) {
  var REGION = 'us-east-1';

  AWS.config.update({
    region: REGION,
    sslEnabled: true,
    accessKeyId: 'ACCESSKEYID',
    secretAccessKey: 'SECRETACCESSKEY'
  });

  var bucket = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
      Bucket: 'bucket'
    }
  });

  nock('https://bucket.s3.amazonaws.com').put('/key').reply(200);

  bucket.putObject({
      Key: 'key',
      Body: new Buffer(10 * 1024 * 1024), // doesn't work
      ContentType: 'binary/octet-stream'
    },
    function (err, resp) {
      if (err) throw err;
      t.deepEqual(resp, {});
      t.end();
    });
});

test('works with s3, body = 16 * 1024 ^ 2', function (t) {
  var REGION = 'us-east-1';

  AWS.config.update({
    region: REGION,
    sslEnabled: true,
    accessKeyId: 'ACCESSKEYID',
    secretAccessKey: 'SECRETACCESSKEY'
  });

  var bucket = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {
      Bucket: 'bucket'
    }
  });

  nock('https://bucket.s3.amazonaws.com').put('/key').reply(200);

  bucket.putObject({
      Key: 'key',
      Body: new Buffer(16 * 1024 * 1024), // doesn't work
      ContentType: 'binary/octet-stream'
    },
    function (err, resp) {
      if (err) throw err;
      t.deepEqual(resp, {});
      t.end();
    });
});
