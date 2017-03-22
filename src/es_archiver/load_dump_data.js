//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
//////////////  temporary solution to help  //////////////
//////////////  keep up to date with master //////////////
//////////////  will remove before merging  //////////////
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

const resolve = require('path').resolve;
const Elasticdump = require('elasticdump').elasticdump;

const ES_URL = 'http://localhost:9200';
const DATA = resolve(__dirname, '../../test/fixtures/dump_data');

function elasticdumpModule(myinput, myoutput, index, mytype) {
  const options = {
    limit:           100,
    offset:          0,
    debug:           false,
    type:            mytype,
    delete:          false,
    all:             false,
    maxSockets:      null,
    input:           myinput,
    'input-index':   null,
    output:          myoutput,
    'output-index':  index,
    inputTransport:  null,
    outputTransport: null,
    searchBody:      null,
    sourceOnly:      false,
    jsonLines:       false,
    format:          '',
    'ignore-errors': false,
    scrollTime:      '10m',
    timeout:         null,
    skip:            null,
    toLog:           null,
  };
  const dumper = new Elasticdump(options.input, options.output, options);
  const promise = new Promise(function (resolve, reject) {
    dumper.dump(function (error) {
      if (error) {
        reject(Error(error));
      } else {
        resolve ('elasticdumpModule success');
      }
    });
  });
  return promise;
}

async function elasticLoad(file, index) {
  await elasticdumpModule(resolve(DATA, file + '.mapping.json'), ES_URL, index, 'mapping');
  await elasticdumpModule(resolve(DATA, file + '.data.json'), ES_URL, index, 'data');
}

elasticLoad(process.argv[2], process.argv[3]).catch(err => {
  console.log('FATAL ERROR', err.stack);
});
