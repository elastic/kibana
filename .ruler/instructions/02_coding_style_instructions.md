## Development Best Practices

### File Organization
- Follow existing casing conventions (mostly lowercase, some exceptions documented in `src/dev/precommit_hook/casing_check_config.js`)
- Place new plugins in appropriate solution/platform directories
- Use TypeScript for new code unless specific JS requirement exists

### Testing Strategy
- Unit tests: Co-locate with source files (`*.test.ts`)
- Integration tests: Use dedicated `api_integration` directories per solution
- UI tests: Use dedicated `functional` directories per solution
- Always run tests before submitting changes

### Code Quality
- Follow TypeScript strict mode conventions
- Use existing shared packages before creating new ones
- Maintain backward compatibility for public APIs

## Code Review Guidelines
These guidelines are in addition to the Development Best Practices section

### Review Focus Areas
**Architecture & Design**
- Plugin placement: Ensure new plugins are in appropriate directories (`src/platform/`, `x-pack/platform/`, `x-pack/solutions/`)
- API design: Check for consistent patterns with existing Kibana APIs
- Performance impact: Review bundle size changes and lazy loading usage
- Accessibility: Verify ARIA labels, keyboard navigation, and screen reader compatibility

**Code Quality Checks**
- Error handling: Proper error boundaries and user-friendly error messages
- Security considerations: Input validation, privilege escalation prevention

**Kibana-Specific Patterns**
- Service injection: Use dependency injection patterns consistently
- Observable patterns: RxJS usage following Kibana conventions
- Elasticsearch integration: Proper client usage and query patterns
- Plugin lifecycle: Correct setup/start/stop implementation

### Common Review Issues
- Missing or inadequate tests (especially for edge cases)
- Missing telemetry for new features
- Inconsistent naming conventions (check `casing_check_config.js`)
- Bundle size increases without lazy loading consideration
