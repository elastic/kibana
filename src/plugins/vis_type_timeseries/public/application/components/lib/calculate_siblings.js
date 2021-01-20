/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

function getAncestors(siblings, item) {
  const ancestors = (item.id && [item.id]) || [];
  siblings.forEach((sib) => {
    if (_.includes(ancestors, sib.field)) {
      ancestors.push(sib.id);
    }
  });
  return ancestors;
}

export const calculateSiblings = (siblings, model) => {
  const ancestors = getAncestors(siblings, model);
  return siblings.filter((row) => !_.includes(ancestors, row.id));
};
