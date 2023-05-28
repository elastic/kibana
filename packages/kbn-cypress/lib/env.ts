import { getAPIBaseUrl } from "./httpClient/config";

export const isCurrents = () =>
  !!process.env.CURRENTS_ENFORCE_IS_CURRENTS ||
  getAPIBaseUrl() === "https://cy.currents.dev";
