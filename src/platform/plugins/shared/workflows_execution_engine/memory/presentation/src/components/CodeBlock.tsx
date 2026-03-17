import React from 'react';
import { Highlight, type PrismTheme } from 'prism-react-renderer';

const workflowEditorTheme: PrismTheme = {
  plain: {
    color: '#343741',
    backgroundColor: '#F5F7FA',
  },
  styles: [
    {
      types: ['key', 'atrule', 'attr-name', 'selector', 'property', 'tag'],
      style: { color: '#007871' },
    },
    {
      types: ['string', 'attr-value'],
      style: { color: '#343741' },
    },
    {
      types: ['comment', 'prolog'],
      style: { color: '#69707D', fontStyle: 'italic' as const },
    },
    {
      types: ['punctuation', 'operator'],
      style: { color: '#69707D' },
    },
    {
      types: ['number'],
      style: { color: '#BA3D76' },
    },
    {
      types: ['boolean', 'keyword', 'builtin'],
      style: { color: '#343741' },
    },
    {
      types: ['important'],
      style: { color: '#BD271E' },
    },
  ],
};

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'yaml' }) => (
  <Highlight theme={workflowEditorTheme} code={code.trim()} language={language}>
    {({ style, tokens, getLineProps, getTokenProps }) => (
      <pre
        className="rounded-lg text-[13px] leading-[23px] my-2.5 p-4 border border-slide-border overflow-visible"
        style={{ ...style, fontFamily: "'Roboto Mono', monospace" }}
      >
        {tokens.map((line, i) => (
          <div key={i} {...getLineProps({ line })}>
            {line.map((token, j) => (
              <span key={j} {...getTokenProps({ token })} />
            ))}
          </div>
        ))}
      </pre>
    )}
  </Highlight>
);
