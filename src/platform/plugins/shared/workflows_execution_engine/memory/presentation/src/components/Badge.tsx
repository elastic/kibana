import React from 'react';

type BadgeVariant = 'blue' | 'green' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-blue-50 text-elastic-blue',
  green: 'bg-teal-50 text-elastic-teal',
  default: 'bg-slide-light text-slide-secondary',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant]}`}>
    {children}
  </span>
);
