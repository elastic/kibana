import _ from 'lodash';

function getAncestors(siblings, item) {
  const ancestors = item.id && [item.id] || [];
  siblings.forEach((sib) => {
    if (_.includes(ancestors, sib.field)) {
      ancestors.push(sib.id);
    }
  });
  return ancestors;
}

export default (siblings, model) => {
  const ancestors = getAncestors(siblings, model);
  return siblings.filter(row => !_.includes(ancestors, row.id));
};

