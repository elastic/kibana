import React from 'react';

interface LogoRowProps {
  src: string;
  name: string;
  badge?: string;
}

export const LogoRow: React.FC<LogoRowProps> = ({ src, name, badge }) => (
  <div className="flex items-center gap-2.5 mb-3.5">
    <img src={src} width={40} height={40} alt={name} className="object-contain" />
    <span className="text-lg font-bold text-slide-text">{name}</span>
    {badge && (
      <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-elastic-blue">
        {badge}
      </span>
    )}
  </div>
);
