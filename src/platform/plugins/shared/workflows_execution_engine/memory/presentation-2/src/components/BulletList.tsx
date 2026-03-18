import React from 'react';

interface BulletListProps {
  items: React.ReactNode[];
  className?: string;
}

export const BulletList: React.FC<BulletListProps> = ({ items, className = '' }) => (
  <ul className={`space-y-3 ${className}`}>
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-3 text-slide-body text-slide-secondary">
        <span className="mt-[9px] w-2 h-2 shrink-0 rounded-full bg-elastic-blue" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);
