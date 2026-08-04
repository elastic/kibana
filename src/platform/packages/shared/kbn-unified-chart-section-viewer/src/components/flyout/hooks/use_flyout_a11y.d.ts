import React from 'react';
export declare const useFlyoutA11y: ({ isXlScreen }: {
    isXlScreen: boolean;
}) => {
    a11yProps: {
        ref: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
        role: string | undefined;
        tabIndex: number | undefined;
        'aria-describedby': string | undefined;
        'data-no-focus-lock': true | undefined;
    };
    screenReaderDescription: false | React.JSX.Element;
};
