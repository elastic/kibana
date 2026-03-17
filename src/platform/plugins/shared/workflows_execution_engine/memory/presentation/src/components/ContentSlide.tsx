import React from 'react';

interface ContentSlideProps {
  title: React.ReactNode;
  children: React.ReactNode;
  centered?: boolean;
}

export const ContentSlide: React.FC<ContentSlideProps> = ({ title, children, centered = false }) => (
  <div className={`flex flex-col w-full max-w-[1060px] ${centered ? 'justify-center min-h-[calc(100vh-120px)]' : ''}`}>
    <h2 className="text-slide-h2 text-slide-text mb-7">{title}</h2>
    {children}
  </div>
);
