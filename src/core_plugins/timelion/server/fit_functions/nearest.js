import _ from 'lodash';

// Upsampling and downsampling of non-cummulative sets
// Good: average, min, max
// Bad: sum, count
module.exports = function (dataTuples, targetTuples) {
  return _.map(targetTuples, function (bucket) {
    const time = bucket[0];
    let i = 0;
    while (i < dataTuples.length - 1 &&
      (Math.abs(dataTuples[i + 1][0] - time) < Math.abs(dataTuples[i][0] - time) ||
       // TODO: Certain offset= args can cause buckets with duplicate times, eg, offset=-1M
       // check for that, and only use the last of the duplicates. The reason this happens?
       // What is 1M before Mar 30th? What about 1M before Mar 31st? Both are the last day
       // in Feb. Something has to be chucked. If offsetting by M user might want to use
       // fit=average
       Math.abs(dataTuples[i + 1][0] - time) === Math.abs(dataTuples[i][0] - time))
    ) {
      i++;
    }

    const closest = dataTuples[i];
    dataTuples.splice(0, i);

    return [bucket[0], closest[1]];
  });
};