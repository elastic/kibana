import { useState, useMemo, type FC } from 'react';

export interface SlideMeta {
  label: string;
  chapter: string;
}

interface TableOfContentsProps {
  slides: SlideMeta[];
  current: number;
  onNavigate: (index: number) => void;
}

interface ChapterGroup {
  chapter: string;
  items: { label: string; index: number }[];
}

export const TableOfContents: FC<TableOfContentsProps> = ({ slides, current, onNavigate }) => {
  const [open, setOpen] = useState(false);

  const chapters = useMemo<ChapterGroup[]>(() => {
    const groups: ChapterGroup[] = [];
    let last = '';
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (s.chapter !== last) {
        groups.push({ chapter: s.chapter, items: [] });
        last = s.chapter;
      }
      groups[groups.length - 1].items.push({ label: s.label, index: i });
    }
    return groups;
  }, [slides]);

  return (
    <>
      <div
        className="fixed left-0 top-0 w-10 h-full z-[60]"
        onMouseEnter={() => setOpen(true)}
      />

      <div
        className={`fixed left-0 top-0 h-full w-72 z-[60] bg-gray-900/95 backdrop-blur-sm
          overflow-y-auto transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="px-5 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-[2px] text-white/40 mb-5">
            Contents
          </h2>

          {chapters.map((group) => (
            <div key={group.chapter} className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/50 mb-1.5 px-2">
                {group.chapter}
              </h3>

              {group.items.map(({ label, index }) => {
                const active = index === current;
                return (
                  <button
                    key={index}
                    onClick={() => { onNavigate(index); setOpen(false); }}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors
                      flex items-center gap-2 group
                      ${active
                        ? 'text-white bg-elastic-blue/20'
                        : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                  >
                    {active && (
                      <span className="w-0.5 h-4 rounded-full bg-elastic-blue shrink-0" />
                    )}
                    <span className={active ? '' : 'pl-[10px]'}>{label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
