import React from 'react';

interface TwoColumnsProps {
  left: React.ReactNode;
  right: React.ReactNode;
  gap?: string;
}

export const TwoColumns: React.FC<TwoColumnsProps> = ({ left, right, gap = 'gap-12' }) => (
  <div className={`grid grid-cols-2 ${gap} w-full items-start`}>
    <div>{left}</div>
    <div>{right}</div>
  </div>
);
