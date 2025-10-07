/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';

/**
 * Hook that injects Monaco-specific CSS that can't be handled through the theme system
 * This includes hover widget styling, connector decorations, and autocomplete icons
 */
export const useMonacoWorkflowStyles = () => {
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const styleId = 'workflow-monaco-styles';
    const existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Enhanced Monaco hover styling for workflow editor */
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]),
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) {
          width: 600px;
          min-width: 500px;
          max-width: 800px;
          max-height: 400px;
          font-size: 13px;
          z-index: 999;
        }
        
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content,
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
          padding: 12px 16px;
        }
        
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents,
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
        }
        
        /* Ensure Monaco's internal glyph hover widgets work properly */
        .monaco-editor [class*="modesGlyphHoverWidget"],
        .monaco-editor [class*="glyph"][class*="hover"] {
          display: block !important;
          visibility: visible !important;
        }
        
        .monaco-editor .monaco-editor-hover .markdown-docs {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }
        
        .monaco-editor .monaco-editor-hover h2 {
          font-size: 16px !important;
          font-weight: 600;
          margin-bottom: 8px !important;
          color: ${euiTheme.colors.primaryText};
        }
        
        .monaco-editor .monaco-editor-hover h3 {
          font-size: 14px !important;
          font-weight: 600;
          margin-top: 16px !important;
          margin-bottom: 8px !important;
          color: ${euiTheme.colors.primaryText};
        }
        
        .monaco-editor .monaco-editor-hover a {
          color: ${euiTheme.colors.primary};
          text-decoration: none;
        }
        
        .monaco-editor .monaco-editor-hover a:hover {
          text-decoration: underline;
        }
        
        .monaco-editor .monaco-editor-hover code {
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 12px;
        }
        
        .monaco-editor .monaco-editor-hover pre {
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          overflow: auto;
          max-height: 120px;
        }
        
        /* Connector inline highlighting */
        .connector-inline-highlight {
          background-color: rgba(255, 165, 0, 0.12) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        
        .connector-inline-highlight.connector-elasticsearch {
          background-color: rgba(255, 215, 0, 0.12) !important;
          box-shadow: 0 1px 2px rgba(255, 215, 0, 0.2) !important;
        }
        
        .connector-inline-highlight::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }
        
        /* Trigger inline highlighting */
        .trigger-inline-highlight {
          background-color: rgba(0, 191, 179, 0.12) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 1px 2px rgba(0, 191, 179, 0.15) !important;
        }
        
        .trigger-inline-highlight::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }
        
        .trigger-inline-highlight.trigger-alert {
          background-color: rgba(240, 78, 152, 0.12) !important;
          box-shadow: 0 1px 2px rgba(240, 78, 152, 0.2) !important;
        }
        
        .trigger-inline-highlight.trigger-scheduled {
          background-color: rgba(255, 193, 7, 0.12) !important;
          box-shadow: 0 1px 2px rgba(255, 193, 7, 0.2) !important;
        }
        
        .trigger-inline-highlight.trigger-manual {
          background-color: rgba(108, 117, 125, 0.12) !important;
          box-shadow: 0 1px 2px rgba(108, 117, 125, 0.2) !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup: remove the style when component unmounts
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [euiTheme]);
};
