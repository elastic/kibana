import React from 'react';

import Node from './node';
import { Span, Transaction } from '../../typings';

const Branch = ({ item, level }: { item: Transaction | Span; level: number }) => {
  const hasChildren = item.children?.length !== 0;

  const renderBranches = () => {
    if (hasChildren) {
      const newLevel = level + 1;

      return item.children?.map((child) => {
        return <Branch key={child.id} item={child} level={newLevel} />;
      });
    }

    return null;
  };

  return (
    <>
      <Node item={item} level={level} />

      {renderBranches()}
    </>
  );
};

export default Branch;
