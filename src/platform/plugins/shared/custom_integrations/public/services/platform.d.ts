export interface CustomIntegrationsPlatformService {
    getBasePath: () => string;
    getAbsolutePath: (path: string) => string;
}
