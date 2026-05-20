import React from 'react';
export interface ESQLToDataViewTransitionModalProps {
    onClose: (dismissFlag?: boolean, needsSave?: boolean) => void;
}
export default function ESQLToDataViewTransitionModal({ onClose, }: ESQLToDataViewTransitionModalProps): React.JSX.Element;
