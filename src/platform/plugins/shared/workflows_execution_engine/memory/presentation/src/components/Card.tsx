import React from 'react';

type CardVariant = 'default' | 'success' | 'info' | 'warn';

interface CardProps {
  variant?: CardVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-slide-light border-slide-border',
  success: 'bg-[#E6FAF9] border-[#B3E8E5]',
  info: 'bg-[#E6F0FA] border-[#B3D4F0]',
  warn: 'bg-[#FFF8E6] border-[#F5E0B3]',
};

export const Card: React.FC<CardProps> = ({ variant = 'default', title, children, className = '' }) => (
  <div className={`rounded-[10px] border p-5 mt-3 ${variantClasses[variant]} ${className}`}>
    {title && <h3 className="text-slide-h3 text-slide-text mb-2">{title}</h3>}
    {children}
  </div>
);
