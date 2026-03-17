import React from 'react';

interface SlideTableProps {
  headers: string[];
  rows: React.ReactNode[][];
  className?: string;
}

export const SlideTable: React.FC<SlideTableProps> = ({ headers, rows, className = '' }) => (
  <table className={`w-full border-collapse text-[15px] mt-2.5 ${className}`}>
    <thead>
      <tr>
        {headers.map((h, i) => (
          <th
            key={i}
            className="text-left px-4 py-3 bg-slide-light text-slide-text font-semibold text-xs uppercase tracking-wider border-b-2 border-slide-border"
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => (
            <td key={j} className="px-4 py-2.5 border-b border-slide-border text-slide-secondary">
              {cell}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
