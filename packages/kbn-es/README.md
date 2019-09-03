# @kbn/es

> A command line utility for running elasticsearch from source or archive.

## Getting started
If running elasticsearch from source, elasticsearch needs to be cloned to a sibling directory of Kibana.

To run, go to the Kibana root and run `node scripts/es --help` to get the latest command line options.

### Examples

Run a snapshot install with a trial license
```
node scripts/es snapshot --license=trial
```

Run from source with a configured data directory
```
node scripts/es source --Epath.data=/home/me/es_data
```

## API

### run
Start a cluster
```
var es = require('@kbn/es');
es.run({
  license: 'basic',
  version: 7.0,
})
.catch(function (e) {
  console.error(e);
  process.exitCode = 1;
});
```

#### Options

##### options.license

Type: `String`

License type, one of: trial, basic, gold, platinum

##### options.version

Type: `String`

Desired elasticsearch version

##### options['source-path']

Type: `String`

Cloned location of elasticsearch repository, used when running from source

##### options['base-path']

Type: `String`

Location where snapshots are cached