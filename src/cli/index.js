if (process.argv.slice(2).indexOf('--watch') > -1) require('./dev/watch');
else require('./cli');
