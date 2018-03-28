#ifndef _SANDBOX_H_
#define _SANDBOX_H_
#include <string>

namespace Sandbox {
    typedef struct {
        bool success;
        std::string message;
    } Result;

    const Result NOT_IMPLEMENTED { false, "Sandboxing is not implemented for this platform" };
    const Result SUCCESS { true, "" };

    Result activate();
};

#endif /* _SANDBOX_H_ */
