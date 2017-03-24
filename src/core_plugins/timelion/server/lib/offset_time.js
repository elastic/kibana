import moment from 'moment';

// usually reverse = false on the request, true on the response
module.exports = function offsetTime(milliseconds, offset, reverse) {
  if (!offset.match(/[-+][0-9]+[mshdwMy]/g)) {
    throw new Error ('Malformed `offset` at ' + offset);
  }
  const parts = offset.match(/[-+]|[0-9]+|[mshdwMy]/g);

  let add = parts[0] === '+';
  add = reverse ? !add : add;

  const mode = add ? 'add' : 'subtract';

  const momentObj = moment(milliseconds)[mode](parts[1], parts[2]);
  return momentObj.valueOf();
};
