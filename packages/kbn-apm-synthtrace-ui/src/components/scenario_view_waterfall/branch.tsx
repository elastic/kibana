import { Service, Span, Transaction } from '../../typings';
import Node from './node';
import React from 'react';

const Branch = ({ item, level }: { item: Transaction | Span | Service; level: number }) => {
  const hasChildren = item.children?.length !== 0;

  const renderBranches = () => {
    if (hasChildren) {
      const newLevel = level + 1;

      return item.children?.map((child) => {
        return <Branch key={child.name} item={child} level={newLevel} />;
      });
    }

    return null;
  };

  return (
    <>
      <Node item={item} hasChildren={hasChildren} level={level} />

      {renderBranches()}
    </>
  );
};

export default Branch;
