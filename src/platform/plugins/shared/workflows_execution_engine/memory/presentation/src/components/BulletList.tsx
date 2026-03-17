import React from 'react';

interface BulletListProps {
  items: React.ReactNode[];
  className?: string;
}

export const BulletList: React.FC<BulletListProps> = ({ items, className = '' }) => (
  <ul className={`space-y-1 ${className}`}>
    {items.map((item, i) => (
      <li key={i} className="text-slide-body text-slide-secondary pl-6 relative">
        <span className="absolute left-0 top-[10px] block w-[8px] h-[8px] rounded-full" style={{ backgroundColor: '#0077CC' }} />
        {item}
      </li>
    ))}
  </ul>
);
