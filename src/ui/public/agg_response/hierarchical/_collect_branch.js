define(function () {
  return function (leaf) {
    // walk up the branch for each parent
    function walk(item, memo) {
      // record the the depth
      const depth = item.depth - 1;

      // Using the aggConfig determine what the field name is. If the aggConfig
      // doesn't exist (which means it's an _all agg) then use the level for
      // the field name
      const { aggConfig } = item;
      const field = (aggConfig && aggConfig.makeLabel())
        || (aggConfig && aggConfig.label)
        || ('level ' + item.depth);

      // Add the row to the tooltipScope.rows
      memo.unshift({
        aggConfig,
        depth: depth,
        field: field,
        bucket: item.name,
        metric: item.size,
        item: item
      });

      // If the item has a parent and it's also a child then continue walking
      // up the branch
      if (item.parent && item.parent.parent) {
        return walk(item.parent, memo);
      } else {
        return memo;
      }
    }

    return walk(leaf, []);
  };
});
