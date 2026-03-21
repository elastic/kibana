import React from 'react';
export interface DiscardStarredQueryModalProps {
    onClose: (dismissFlag?: boolean, removeQuery?: boolean) => Promise<void>;
}
export default function DiscardStarredQueryModal({ onClose }: DiscardStarredQueryModalProps): React.JSX.Element;
