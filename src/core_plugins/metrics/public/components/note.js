import React from 'react';
export function Note({ children, style = {} }) {
  return (
    <div
      style={style}
      className="vis_editor__descNote"
    >
      {children}
    </div>
  );
}

