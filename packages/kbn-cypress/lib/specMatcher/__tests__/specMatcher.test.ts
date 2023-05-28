import { findSpecs } from "../specMatcher";

describe("Spec Matcher", () => {
  it("runs multiple spec files when comma separated", async () => {
    await findSpecs({
      projectRoot: __dirname,
      testingType: "e2e",
      specPattern: ["fixtures/*.cy.ts"],
      configSpecPattern: ["fixtures/*.cy.ts"],
      excludeSpecPattern: [],
      additionalIgnorePattern: [],
    });
  });
});
