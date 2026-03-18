import { useState, useEffect, useCallback, type FC } from 'react';

const ExpandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 1 1 1 1 6" />
    <polyline points="12 1 17 1 17 6" />
    <polyline points="6 17 1 17 1 12" />
    <polyline points="12 17 17 17 17 12" />
  </svg>
);

const CollapseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 6 6 6 6 1" />
    <polyline points="12 1 12 6 17 6" />
    <polyline points="1 12 6 12 6 17" />
    <polyline points="17 12 12 12 12 17" />
  </svg>
);

export const FullscreenToggle: FC = () => {
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <>
      <div
        className="fixed bottom-0 right-0 w-20 h-20 z-[60]"
        onMouseEnter={() => setVisible(true)}
      />

      <button
        onClick={toggle}
        onMouseLeave={() => setVisible(false)}
        className={`fixed bottom-12 right-12 z-[60] w-10 h-10 rounded-lg
          bg-gray-900/80 backdrop-blur-sm text-white/80 hover:text-white
          flex items-center justify-center transition-opacity duration-200
          ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
      </button>
    </>
  );
};
