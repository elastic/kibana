/**
 * @class RandomList
 */

module.exports = RandomList;

function RandomList(list) {
  this.get = function () {
    return list[Math.round(Math.random() * list.length)];
  };
}
