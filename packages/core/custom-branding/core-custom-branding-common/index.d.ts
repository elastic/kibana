export interface CustomBranding {
    /**
     * Custom replacement for the Elastic logo in the top lef *
     * */
    logo?: string;
    /**
     * Custom replacement for favicon in SVG format
     */
    faviconSVG?: string;
    /**
     * Custom page title
     */
    pageTitle?: string;
    /**
     * Custom replacement for Elastic Mark
     * @link packages/core/chrome/core-chrome-browser-internal/src/ui/header/elastic_mark.tsx
     */
    customizedLogo?: string;
    /**
     * Custom replacement for favicon in PNG format
     */
    faviconPNG?: string;
}
