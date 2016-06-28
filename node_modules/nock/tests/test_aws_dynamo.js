var nock = require('../');
var AWS = require('aws-sdk');
var test = require('tap').test;

test('works with dynamodb', function(t) {
  var done = false;
  var REGION = 'us-east-1';

  AWS.config.update({
      'region': REGION,
      'sslEnabled': true,
      'accessKeyId': 'ACCESSKEYID',
      'secretAccessKey': 'SECRETACCESSKEY'
  });

  var db = new AWS.DynamoDB();

  nock('https://dynamodb.' + REGION + '.amazonaws.com')
      .post('/')
      .reply(200, {});

  db.getItem(
    {
      Key: {
        Artist: {
          S: 'Lady Gaga'
        }
      },
      TableName: 'Music'
    },
    function(err, resp) {
      if (err) throw err;
      t.deepEqual(resp, {});
      t.end();
    });
});

