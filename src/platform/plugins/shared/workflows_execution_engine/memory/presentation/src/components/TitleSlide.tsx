import React from 'react';

interface TitleSlideProps {
  chapterLabel?: string;
  title: React.ReactNode;
  subtitle?: string;
  meta?: string;
  showFullLogo?: boolean;
}

export const TitleSlide: React.FC<TitleSlideProps> = ({
  chapterLabel,
  title,
  subtitle,
  meta,
  showFullLogo = false,
}) => (
  <div className="flex flex-col justify-center items-start w-full max-w-[1060px]">
    {chapterLabel && (
      <div className="flex items-center gap-3 mb-4">
        <img src="/icons/elastic-logo.svg" width={32} height={32} alt="Elastic" />
        <span className="text-sm font-medium uppercase tracking-[2px] text-white/70">
          {chapterLabel}
        </span>
      </div>
    )}
    <h1 className="text-slide-h1 text-white mb-5">{title}</h1>
    {subtitle && (
      <p className="text-xl text-white/80 font-normal max-w-[620px] leading-relaxed">
        {subtitle}
      </p>
    )}
    {meta && <p className="text-sm text-white/50 mt-5">{meta}</p>}

    {showFullLogo && (
      <div className="absolute bottom-10 left-20 flex items-center gap-2.5">
        <img src="/icons/elastic-logo.svg" width={40} height={40} alt="Elastic" />
        <span className="text-base font-semibold text-white/80">elastic</span>
        <div className="w-px h-5 bg-white/40 mx-1" />
        <span className="text-xs font-normal text-white/60 leading-tight">
          The Search<br />AI Company
        </span>
      </div>
    )}
  </div>
);
