define(function () {
  'use strict';
  return function (item, initial) {
    var classes = [item.type];
    if (initial) {
      classes.push(initial);
    }
    if (item.type === 'shard') {
      classes.push((item.primary && 'primary') || 'replica');
      classes.push(item.state.toLowerCase());
      if (item.state === 'UNASSIGNED' &&  item.primary) {
        classes.push('emergency');
      }
    }
    if (item.master) {
      classes.push('master');
    }
    return classes.join(' ');
  };
});
