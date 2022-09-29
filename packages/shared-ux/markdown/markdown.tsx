import { EuiMarkdownEditor } from '@elastic/eui';
import React, { useState } from 'react';

interface MarkdownProps {
    initialContent: string;
    ariaLabelContent: string;
}

export const Markdown = ({ initialContent, ariaLabelContent }: MarkdownProps) => {
    const [value, setValue] = useState(initialContent);
    
    return (
        <EuiMarkdownEditor  
        aria-label={ariaLabelContent ?? "markdown component"}
        placeholder="Your markdown here..."
        initialViewMode="viewing"
        value={value}
        onChange={setValue}
        height={200}
        />
    )
    
}